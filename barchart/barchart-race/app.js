// 参考自 https://observablehq.com/@d3/bar-chart-race

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
// const height = container.clientHeight; // 高度
const margin = { top: 16, right: 6, bottom: 6, left: 0 };

// 需要在 svg 中展示的柱子数量
const n = 12;

// 条形图中矩形柱子的带宽
barSize = 48;

// 因为原始数据是以年份为时间单位，间隔太大
// k 是指在两个相应（年份）的真实数据点之间插值的数量，用以创建更流畅的动画
const k = 10;

// 过渡动效的默认持续时间是 250ms
const duration = 250;

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/9f813f85ff62a8e741bb0c518bdce57a/raw/5a2ff4b01d7b4aec6d3b88feadb86ba0dde399cb/category-brands.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // data = result
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 数据处理
   *
   */
  // 从原始数据中提取出企业的名称
  // 每一个数据点（就是表格的每一行）依次调用 data.map(d => d.name)
  // 传入的参数 d 是当前所遍历的数据点，其中 d.name 属性就是该数据项所表示公司的名称
  // 再基于这些企业名称（一个数组），创建一个 InternSet 对象，以便去重
  // 所以 names 是数据集中所包含的所有企业名称（非重复，从 2000 年到 2019 年入选的企业共有 173 家）
  const names = new Set(data.map((d) => d.name));

  // 基于日期（年份）对数据进行转换，并将数据基于日期进行升序排序（从 2000 年到 2009 年）
  // 通过 d3.rollup() 得到的是一个 InternMap 对象
  // 再使用 Array.from() 方法将其转换回数组
  const datevalues = Array.from(
    d3.rollup(
      data,
      ([d]) => d.value,
      (d) => +d.date,
      (d) => d.name
    )
  )
    // 因为在上一步转换时，+d.date 将日期转换为毫秒数
    // 所以调用 JavaScript 数组的原生方法 array.map() 对每一个分组（一个二维数组）进行遍历
    // 并将其中的用毫秒表示的日期，new Date(date) 变回用日期对象表示
    .map(([date, data]) => [new Date(date), data])
    // 最后对各分组基于日期进行升序排序
    // 其中 ([a], [b]) => d3.ascending(a, b) 接收两个需要对比的分组
    // 然后分别对它们（二维数组）进行解构 [a] 和 [b]，获取它们的日期
    .sort(([a], [b]) => d3.ascending(a, b));

  // 计算 names 集合中所列出的所有公司的价值，并添加上相应的排序信息
  // 传入的 valueFunc 参数是一个函数，用于获取给定名称的公司的价值
  function rank(valueFunc) {
    // 构建一个数组 data，它的每一个元素都是一个对象，该对象的 name 属性是公司的名称，value 属性是该公司的价值
    // Array.from(literator, mapFunc) 方法对给定的可迭代对象里的每一个元素都调用映射函数 mapFunc 进行转换处理
    // 其中参数 names 是一个包含所有公司名称的集合 set
    // valueFunc 是一个函数，它接收一个参数 name 即公司的名称，然后返回该公司的价值
    const data = Array.from(names, (name) => ({
      name,
      value: valueFunc(name)
    }));
    // 再基于各元素的值 value 进行降序排序
    data.sort((a, b) => d3.descending(a.value, b.value));
    // 为数组 data 的每一个元素（对象）添加一个 rank 属性，属性值是（该元素在数组中的）索引值 i 和 n 变量两者中的较小值
    // 其中 n 是需要在 svg 中展示的条形柱子数量
    for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
    return data;
  }

  // 计算更多时间点的数据（对应于过渡动画的「每一帧」）
  // 例如当 k=10 时，即在两个（相邻年份）原始数据之间插入 9 个数据点
  // 所以原来从 2000 至 2019 年原有 20 个数据点，在相邻的年份之间都插入 9 个数据点
  // ✨ 最终返回的 keyframes 数组共有 20+19*9=191 个元素
  // ✨ 而且每一个元素的形式都是 [date, data] 二元数组，第一个值 date 就是时间点；第二个值 data 就是一个包含公司价值的对象数组，具有 173 个元素（即每一个时间点的数据都包含所有的公司的价值数据）
  const keyframes = []; // 容器是每一帧（对应于某个日期的数据）
  let ka, a, kb, b;
  // d3.pairs(iterable[, reducer]) 方法将相邻元素两两配对，生成一个新的数组
  // 更多关于 d3.rollup() 方法的信息可以参考官方文档 https://github.com/d3/d3-array/#rollup 或笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#转换 的相关部分
  // 然后遍历所得的数组（每一个元素都是一个二维数组）
  // 并通过解构数组得到相应的数据
  // ka 是年份（日期对象），a 是该年份（分组）所对应的数据
  // kb 是紧接着 ka 下一年的年份（日期对象），b 就是该年份对应的数据
  for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
    // 计算插值数据
    // 其中 k 表示在两个（时间间隔跨度为年份）原始数据之间需要插值的数量
    // k 的值越大，表示插值的数量越多，这样（各横向柱子的长度变化）过渡动画就显得越「流畅」
    // 例如当 k=10 时，则插入 9 个数据
    // ⚠️ 遍历时从 i=0 开始，到 i<k（所以只包含下限，不包含上限）
    // 即 push 到 keygrames 数组的原始数据只有 [ka, a]
    for (let i = 0; i < k; ++i) {
      // 使用 linear interpolation 线性插值法，估算出给定日期 date 所对应的数据
      // 关于线性插值法的公式具体解释可以参考 https://datavis-note.benbinbin.com/article/theory/algorithm/linear-interpolation
      // t 是当前创建的插值所对应的归一化距离，其范围是 (0, 1)
      // 那么两个原始数据 a 和 b 就分别位于 [0, 1] 的两个端点
      const t = i / k;
      // 计算插值，并 push 到 keyframes 数组中
      keyframes.push([
        // 该插值所对应的的日期（对象）
        new Date(ka * (1 - t) + kb * t),
        // ✨ 这里调用 rank() 函数来估算出在当前日期**所有公司**的价值
        // 其中在方法 rank(valueFunc) 传入的参数 valueFunc 是一个函数，用于获取给定公司（名称）的价值
        // 这个函数的核心就是用线性插值法 $y=y_{0}(1-t)+y_{1}t$ 基于该公司在两个（年份）时间点的已知价值，估算出（在这两个时间点之间）特定时间点（用归一化距离 t 表示）该公司的价值
        // 但是看起来比价复杂，因为其中还包含一些条件判断逻辑
        // 因为每一年的数据中，并非包含所有公司的价值，所以 a.get(name) 和 b.get(name) 从原数据中获取指定公司的价值时可能返回 undefined，此时就假设该公司在该年份的价值为 0，
        rank((name) => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
      ]);
    }

    // ⚠️ 因为前面遍历插值过程中，只包含下限，不包含上限
    // 所以最后还需要将原始数据里的最后一个数据 [kb, b] 追加进去，即 2019 年的数据
    keyframes.push([new Date(kb), rank((name) => b.get(name) || 0)]);
  }

  // 先使用 JS 数组的原生方法 arr.flatMap(mapFunc) 将嵌套数组 keyframes 展平
  // keyframes 是一个具有多级嵌套的数组，其中每一个元素都是一个二维数组
  // 二维数组的第一个值是日期，第二个值则是所有公司在该时间点的价值（而这个值也是一个数组）
  // arr.flatMap(mapFunc) 方法会先对数组的每个元素进行映射，然后再展平（一级）这个嵌套数组
  // mapFunc 映射函数 ([, data]) => data 的作用是将原来每个元素中的第二个值抽取出来，只保留公司的价值，而不需要日期信息（转换后得到的依然是一个嵌套数组，只不过嵌套层级相较于原数组 keyframes 少一层）
  // 再将嵌套数组「拍平」一级，会得到一个对象数组
  // 每一个元素都是一个对象，这些对象都具有 3 个属性 name 公司名，value 公司价值，rank 排名
  // ---
  // 然后使用 D3 的内置方法 d3.groups(iterable, ...keys) 对展平的数组进行分组转换
  // 第一参数是需要分组的可迭代对象，即展平的数组
  // 第二个参数 d => d.name 是分组依据，基于每个元素（对象）的 name 属性
  // 最后返回一个数组 nameframes，其中每一个元素就是一个分组，因为共有 173 家企业，所以共有 173 个元素/分组
  // 每一个元素都以一个二元数组来表示
  // 在二元数组中，第一个元素就是该分组所属的 key 属性值，在该示例中就是公司的名称；第二元素则是一个数组，其中包含了属于该分组的数据集中的元素，在该示例中就是在 keyFrames 中属于该公司的那些数据，经过前面的插值操作后，每个公司最后就会具有 191 个数据，并按照日期从旧到新的顺序排列（从 2000 年到 2019 年）
  const nameframes = d3.groups(
    keyframes.flatMap(([, data]) => data),
    (d) => d.name
  );

  // 这里的数据是用于设置 entering 选择集元素的（从视图底部）缓入动效
  // 先使用 d3.pairs(iterable[, reducer]) 方法将各个公司的数据按日期的先后顺序**两两配对**得到一个多级嵌套的数组
  // 在 nameframes 数组中，每个公司的数据都是按照时间先后顺序（从 2000 年到 2019 年）排列的
  // 因为设置了第二个参数 reducer 函数 (a, b) => [b, a] 所以两两配对生成的一系列二元数组 [b, a]，其实数据 b 所对应的时间点是**较 a 晚一点**（但是这一系列二元数组的整体时间顺序依然是遵循从 2000 年到 2019 年的）
  // ---
  // 然后使用 arr.flatMap() 对上一步所得到的多级嵌套的数组**展平（外面的）一级**
  // 得到一个数组，里面每个元素都是一个二元数组，是将各公司的数据按日期的先后顺序**两两配对**的数据包含在一起
  // ---
  // 最后使用 new Map() 将数组转换为一个集合
  // 通过嵌套数组（元素是一个二元数组）来创建集合时，会将每个二元数组的第一值作为 key，第二个值就是对应的映射 value
  // 这样就创建一个集合，可以通过下一时间点的数据找回/映射到上一个时间点的数据
  const prev = new Map(
    nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a]))
  );

  // 这里的数据是用于设置 exiting 选择集元素的（从视图底部）缓出动效
  // 和 prev 类似，也是一个关于邻近时间点的数据映射关系的集合
  // 不同的是在通过 d3.pairs() 方法将各公司的数据进行两两配对时，未设置 reducer 函数
  // 即使用元素的默认顺序，生成一系列 [a, b] 顺序的二元数组
  // 这样就创建一个集合，可以通过上一帧的数据找到/映射到下一帧的数据
  const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));

  /**
   *
   * 比例尺与坐标轴
   *
   */
  // 横轴比例尺
  // 对于数值型数据，默认采用线性比例尺
  // 这里先将定义域设置为 [0, 1]，作为一个占位符❓之后再用真实数据来进行更新
  // 值域就是视觉图形元素的展示范围，即 svg 的宽度，还考虑了 svg 的留白区域 margin 的影响
  const x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);

  // 纵轴比例尺
  // 纵坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  const y = d3
    .scaleBand()
    // 设置定义域
    // 先通过 d3.range(n + 1) 创建一个等差数列，从 0 到 n，共有 n 个元素
    // 这个从 0 开始的等差数列正好就对应于公司价值的排名高低（也是从 0 开始）
    // 所以使用该比例尺时，可以通过公司的排名 rank 映射得到相应矩形柱子的
    .domain(d3.range(n + 1))
    // 设置值域
    // 如果纵坐标是映射定量数值时，应该特别留意 svg 的坐标体系的正方向（向右，向下）
    // 但是因为当前绘制的是横向条形图，纵轴映射的是分类数据
    // 💡 所以这里的值域**不一定需要**采用从下往上与定义域进行映射 [bottom, top]
    // 这里默认就采用 [top, bottom]
    // 值域就是视觉图形元素的展示范围，即 svg 所需的高度，主要是由矩形柱子数量所 n 决定的（其中 barSize 是带宽，在该示例还考虑了邻近柱子之间的间隔大小 0.1），还考虑了 svg 的留白区域 margin 的影响
    // 一般使用 scale.range() 方法来设置值域，但这里采用的是 scale.rangeRound() 方法
    // 相对而言，后一个方法会对传入的范围的**两端进行四舍五入的修约**，让两端成为整数，更适合可视化
    .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
    .padding(0.1); // 设置间隔占据（柱子）区间的比例

  // 分类比例尺
  // 将离散的数据映射为不同的颜色
  // 在该示例中为不同的产业类别映射为不同的颜色
  // d3.schemeTableau10 是一个 Color Scheme
  // 它是一个分类型 categorical 配色方案，由 Tableau 预选了 10 种色彩用于标识不同的类别
  // 它是一个包含 12 个元素的数组，每一个元素是一个色值字符串
  let color;

  const scale = d3.scaleOrdinal(d3.schemeTableau10);
  // 当原始数据集 data 的数据点存在 category 属性时，才进一步设置该比例尺（定义域）
  if (data.some((d) => d.category !== undefined)) {
    // 创建一个映射 map，它包含了所有公司名称 d.name 与其所属产业 d.category 的映射
    const categoryByName = new Map(data.map((d) => [d.name, d.category]));
    // categoryByName.values() 返回一个可迭代对象，包含所有的产业（共 22 个），作为比例尺的定义域
    scale.domain(categoryByName.values());
    // 返回一个函数，可以基于数据点的 d.name 公司名，通过比例尺的映射得到其所属产业对应的颜色
    color = (d) => scale(categoryByName.get(d.name));
  } else {
    // 如果当原始数据集 data 的数据点没有 category 属性时，则先不设置定义域
    // 也是返回一个函数，基于数据点的 d.name 公司名，通过比例尺的映射得到其所对应的颜色（同时将该公司记录到比例尺的定义域中）
    // 在不断地调用比例尺时，才不断记录和创建定义域，这样在下一次调用比例尺时，如果传入相同的公司名，就会映射得到相同的颜色
    color = (d) => scale(d.name);
  }

  // 💡 如果定义域数量多于值域，就进行「循环」映射
  // 例如在该示例中，d3.schemeTableau10  配色方案只有 10 种不同的颜色，而不同的产业有 22 个，公司名称有 173 个，所以可能会出现「撞色」，即重复使用色值的情况

  /**
   *
   * 绘制或更新图像元素的一系列核心函数
   *
   */
  // 创建/更新条形图的矩形柱子
  // 接收一个参数 svg（一个包含 svg 元素的选择集），在其中绘制条形图
  function bars(svg) {
    let bar = svg
      .append("g") // 创建一个矩形柱子的容器 <g>
      .attr("fill-opacity", 0.6) // 将其中的元素的填充透明度设置为 0.6
      .selectAll("rect");

    // 返回一个函数，接收两个参数
    // 第一个参数 [date, data] 是由日期和数据构成的二元数组（keyframe 数组的元素）
    // 第二个参数 transition 是过渡管理器
    // 返回的函数的作用是基于上面传入的参数更新 bar
    return ([date, data], transition) =>
    (bar = bar
      // 绑定新数据
      // 其中 data 是一个对象数组，就是该时间点 173 家公司的价值数据，该对象的结果样例是 {name: "Coca-Cola", value: 72537, rank: 0}
      // 通过 data.slice(0, n) 复制其中前 n 个元素（从索引值为 0 到 n-1 的元素），用于绘制 n 个矩形柱子
      // 并将公司名 d.name 作为 key（唯一标识符），以便更新页面时复用矩形柱子元素
      .data(data.slice(0, n), (d) => d.name)
      // 更新页面图像元素
      .join(
        // 设置 entering 选择集
        (enter) =>
          enter
            .append("rect")
            // 使用 <rect> 元素来绘制柱子
            // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
            .attr("fill", color) // 设置柱子的颜色（根据公司所属的产业）
            // 矩形的高度
            // 即柱子的大小，通过纵轴的比例尺的方法 y.bandwidth() 获取 band 的宽度（不包含间隙 padding）
            .attr("height", y.bandwidth())
            // 因为绘制的是水平方向的条形图
            // 所以每个柱子都是对齐到 y 轴的，即矩形的左上角横坐标值都是 x(0)
            .attr("x", x(0))
            // 左上角纵坐标值
            // 其中 d 是当前遍历的矩形柱子所绑定的数据，一个对象，其中属性 rank 是该公司价值的排名
            // 通过排名值来获取相应的矩形柱子的左上角纵坐标值
            // ⚠️ 这里值得注意的是，默认采用的数据（对象）的时间点并不是「当前」的，而是邻近的上一个时间点 prev.get(d)（而当前时间点的数据 d 则作为回退的备选项）
            // 这是想为新增/新插入的柱子元素设置动效，所以先通过上一个时间点的数据 prev.get(d) 来获取这些元素的定位，作为它们的**初始状态**（它们的排序 rank 必然是大于 n 的，即定位远超于页面视图）
            // 然后再通过一个过渡管理器，以当前时间点的数据 d 来获取这些元素的定位（👇在该函数的最后部分）
            // 这样 entering 选择集中新增的矩形元素就会有一个（从底部）缓进的动效
            .attr("y", (d) => y((prev.get(d) || d).rank))
            // 矩形的宽度
            // 即水平柱子的长度，通过比例尺映射后，柱子的宽度是 x(d.value) - x(0)) 的差值
            // ⚠️ 这里值得注意的是，默认采用的数据也是邻近的上一个时间点 prev.get(d) 也是为设置动效（长度变化）
            .attr("width", (d) => x((prev.get(d) || d).value) - x(0)),
        // 设置 updating 选择集
        // 不进行处理，直接返回该选择集
        (update) => update,
        // 设置 exting 选择集
        // 将该选择集中的元素移除，并使用过渡管理器 transition 的配置，为该过程该过程创建一个过渡
        (exit) =>
          exit
            .transition(transition)
            .remove()
            // 过渡最终状态矩形柱子左上角的纵坐标值
            .attr("y", (d) => y((next.get(d) || d).rank))
            // 过渡最终状态矩形柱子的宽度
            .attr("width", (d) => x((next.get(d) || d).value) - x(0))
        // 最终状态使用下一个时间点的数据 next.get(d) 来设置（而当前时间点的数据 d 则作为回退的备选项）
        // 所以移除的矩形柱子会有一个（从底部）缓出，而且宽度同步变化的动效
      )
      // 最后用当前时间点的数据来更新矩形元素的定位和长度
      // 并使用过渡管理器 transition 的配置，为该过程该过程创建一个过渡
      .call((bar) =>
        bar
          .transition(transition)
          // 前面没有根据新数据更新 updating 选择集的元素的定位和长度
          // 而且前面将 entering 选择集的元素采用上一个时间点数据 prev.get(d) 进行定位和设置长度
          .attr("y", (d) => y(d.rank)) // 更新选择集（合并了 updating 和 entering 选择集）元素的定位 👈
          .attr("width", (d) => x(d.value) - x(0))
      )); // 更新选择集元素的宽度
  }

  // 绘制/更新横坐标轴
  // 接收一个参数 svg（一个包含 svg 元素的选择集），在其中绘制横坐标轴
  function axis(svg) {
    const g = svg
      .append("g") // 创建一个横坐标轴容器 <g>
      // 通过设置 CSS 的 transform 属性将横向坐标轴容器「移动」到顶部
      .attr("transform", `translate(0,${margin.top})`);

    const tickFormat = undefined; // override as desired

    // 横轴是一个刻度朝上的坐标轴
    const axis = d3
      .axisTop(x)
      // 以下设置坐标轴的刻度数量和样式
      .ticks(width / 160, tickFormat)
      .tickSizeOuter(0) // 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      // 将内侧刻度线的长度设置为与条形图的高度一样长 -barSize * (n + y.padding()) ，前面添加负号，表示刻度线的延伸方向是向下（因为 d3.axisTop() 创建的是一个刻度向上的坐标轴）
      // 这样第一条刻度线可以作为 y 轴，而其他刻度线就可以作为纵向的参考线
      .tickSizeInner(-barSize * (n + y.padding()));

    // 返回一个函数，接收两个参数（虽然只是用到第二个参数，这是为了统一返回函数的形式❓）
    // 第一个参数 [date, data] 是由日期和数据构成的二元数组（keyframe 数组的元素），但是在这里用不到，所以用下划线 _ 作为一个占位符
    // 第二个参数 transition 是过渡管理器
    // 返回的函数的作用是更新横坐标轴
    return (_, transition) => {
      // 调用坐标轴（对象）方法，在页面绘制/更新横向坐标轴
      // 并使用过渡管理器 transition 的配置，为该过程该过程创建一个过渡
      g.transition(transition).call(axis);
      g.select(".tick:first-of-type text").remove(); // 移除了第一个刻度值（即横坐标轴的零点 0）
      // 除了第一条内侧的刻度线（它作为 y 轴），其他内侧的刻度线都设置为白色
      g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
      g.select(".domain").remove(); // 删掉横坐标轴的轴线
    };
  }

  // 该函数用于制作数字 tween 动画（类似秒表计数的动效）
  function textTween(a, b) {
    // 使用 d3.interpolateNumber(a, b) 创建一个插值范围为 [a, b] 的数值插值器
    // 关于插值器的详细说明可以参考官方文档 https://github.com/d3/d3-interpolate 或笔记的相关部分 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#插值器
    const i = d3.interpolateNumber(a, b);

    // 创建数字格式器
    // 每千位以逗号 , 进行分组
    // 有效数字四舍五入保留到整数
    const formatNumber = d3.format(",d");

    // 最后返回的插值器，可以在 a 和 b 之间进行插值
    // 插值器是用于计算过渡值的，以便实现补间动画
    // 在过渡期间调用插值器函数，它接受一个**标准时间** `t` 作为入参，然后结合起始值和结束值，返回该时间点的过渡值
    return function (t) {
      // 使用 formatNumber() 方法对插值结果 i(t) 进行数字格式的转换
      // 因为在过渡期间，调用（传入时间 t）插值器的是选择集中的每一个元素，所以 this 就是当前所遍历 DOM 元素
      // 所以可以通过 this.textContent 来设置当前所遍历的元素的内容
      this.textContent = formatNumber(i(t));
    };
  }

  // 创建/更新每个柱子标注的信息
  // 接收一个参数 svg（一个包含 svg 元素的选择集），在其中绘制柱子的标注信息
  function labels(svg) {
    let label = svg
      .append("g") // 创建一个标注信息的容器 <g>
      // 以下 CSS 属性用于设置字体样式
      .style("font", "bold 12px var(--sans-serif)")
      .style("font-variant-numeric", "tabular-nums") // 使数字等宽，易于对齐
      .attr("text-anchor", "end") // 对齐到尾部，所以文字向左侧延伸
      .selectAll("text");

    // 返回一个函数，接收两个参数
    // 第一个参数 [date, data] 是由日期和数据构成的二元数组（keyframe 数组的元素）
    // 第二个参数 transition 是过渡管理器
    // 返回的函数的作用是基于上面传入的参数更新 label
    return ([date, data], transition) =>
    (label = label
      // 绑定新数据，其中 data 是一个对象数组，就是该时间点 173 家公司的价值数据，该对象的结果样例是 {name: "Coca-Cola", value: 72537, rank: 0}
      .data(data.slice(0, n), (d) => d.name) // 绑定新数据，只取前 n 个元素，并将公司名 d.name 作为 key
      .join(
        // 设置 entering 选择集
        (enter) =>
          enter
            .append("text")
            // 通过 CSS 的 transform 属性来设置各标注信息的定位
            // 其中 d 是当前遍历的文字元素所绑定的数据，一个对象
            // ⚠️ 这里值得注意的是，默认采用的数据是邻近的上一个时间点 prev.get(d)（而当前时间点的数据 d 则作为回退的备选项）
            // 这是想为新增/新插入（柱子元素）的标注信息设置动效
            // 所以先通过上一个时间点的数据 prev.get(d) 来计算出元素的定位，作为它的**初始状态**
            // 然后再通过一个过渡管理器，以当前时间点的数据 d 来计算元素的定位（👇在该函数的最后部分）
            // 这样 entering 选择集中新增（柱子元素）的标注信息就会有一个（从底部）缓进的动效
            .attr(
              "transform",
              (d) =>
                `translate(${x((prev.get(d) || d).value)},${y(
                  (prev.get(d) || d).rank
                )})`
            )
            // 对文字进行偏移微调
            .attr("y", y.bandwidth() / 2)
            .attr("x", -6)
            .attr("dy", "-0.25em")
            .text((d) => d.name) // 文字内容，公司的名称
            // 在 <text> 元素中添加一个 <tspan> 元素
            // 相当于 SVG 的 <span> 元素，可以为其中的文字内容另外设置不同的样式
            // 用于显示该公司的相应价值
            .call(
              (text) =>
                text
                  .append("tspan")
                  .attr("fill-opacity", 0.7) // 设置透明度
                  .attr("font-weight", "normal") // 设置字重
                  // 对文字进行偏移微调
                  .attr("x", -6)
                  .attr("dy", "1.15em") // 设置纵向偏移，避免公司的价值（数字）与公司的名字重叠
            ),
        // 设置 updating 选择集
        // 不进行处理，直接返回该选择集
        (update) => update,
        // 设置 exting 选择集
        // 将该选择集中的元素移除，并使用过渡管理器 transition 的配置，为该过程该过程创建一个过渡
        (exit) =>
          exit
            .transition(transition)
            .remove()
            // 过渡最终状态的文字定位通过 CSS 的 transform 属性来设置
            // 最终状态使用下一个时间点的数据 next.get(d) 来设置（而当前时间点的数据 d 则作为回退的备选项）
            // 所以移除（柱子元素）的标注信息会有一个（从底部）缓出
            .attr(
              "transform",
              (d) =>
                `translate(${x((next.get(d) || d).value)},${y(
                  (next.get(d) || d).rank
                )})`
            )
            // 在过渡的过程中，还同时为公司价值的数字设置 tween 动画（类似秒表计数的动效）
            // 使用 transition.tween(name[, value]) 方法设置补间动画
            // 第一个参数是需要设置的元素属性
            // 第二个参数是一个返回插值器的函数（选择集的每个元素依次调用它，传入的参数 d 是元素所绑定的数据）
            // 更详细的说明可以查看官方文档 https://github.com/d3/d3-transition/#transition_tween
            // 其中 textTween() 返回一个插值器，可以基于当前时间点的公司价值 d.value 和下一个时间点的公司价值 next.get(d)，在过渡期间计数出一系列的插值（如果下一个时间点的公司价值未定义，则以当前时间点的数据 d 则作为回退的备选项）
            .call((g) =>
              g
                .select("tspan")
                .tween("text", (d) =>
                  textTween(d.value, (next.get(d) || d).value)
                )
            )
      )
      // 最后用当前时间点的数据来更新标注信息的定位
      // 并使用过渡管理器 transition 的配置，为该过程该过程创建一个过渡
      .call((bar) =>
        bar
          .transition(transition)
          // 前面没有根据新数据更新 updating 选择集的元素的定位
          // 而且前面将 entering 选择集的元素采用上一个时间点数据 prev.get(d) 进行定位
          .attr("transform", (d) => `translate(${x(d.value)},${y(d.rank)})`) // 在这里更新选择集（合并了 updating 和 entering 选择集）元素的定位 👈
          // 另外在过渡的过程中，也对 updating 和 entering 选择集中的元素中表示公司价值的数字设置 tween 动画
          // 从上一个时间点的公司价值 prev.get(d) 变动到当前时间点的公司价值 d.value
          .call((g) =>
            g
              .select("tspan")
              .tween("text", (d) =>
                textTween((prev.get(d) || d).value, d.value)
              )
          )
      ));
  }

  // 创建/更新条形图右下角的年份标记
  // 接收一个参数 svg（一个包含 svg 元素的选择集），在其中绘制年份标记
  function ticker(svg) {
    // 时间格式器
    const formatDate = d3.utcFormat("%Y"); // 提取年份（时间采用 UTC 世界时间标准）

    const now = svg
      .append("text")
      // 设置文字样式
      .style("font", `bold ${barSize}px var(--sans-serif)`)
      .style("font-variant-numeric", "tabular-nums")
      .attr("text-anchor", "end")
      // 文字的定位，「移到」右下角
      .attr("x", width - 6)
      .attr("y", margin.top + barSize * (n - 0.45))
      .attr("dy", "0.32em")
      // 文字内容（当前时间点的年份）
      // 从 keyframes 的第一个元素中获取初始日期
      // 然后用 formatDate() 方法进行日期格式的转换，提取出年份
      .text(formatDate(keyframes[0][0]));

    // 返回一个函数，接收两个参数
    // 第一个参数 [date] 其实传入的是 keyframe 数组的元素，这里解构出第一个元素，因为只需要用到日期
    // 第二个参数 transition 是过渡管理器
    // 返回的函数的作用是基于传入的参数更新 ticker
    return ([date], transition) => {
      // 当过渡结束（页面的元素更新完成）时，再更新年份标记
      // 这里使用 transition.end() 方法
      // 它返回一个 Promise，再通过链式调用 then() 就可以在过渡结束时做出响应，执行特定的操作
      // 这涉及到 D3 过渡的生命周期，具体内容可以查看官方文档 https://github.com/d3/d3-transition#transition_end 或笔记的相关部分 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#过渡的生命周期
      transition.end().then(() => now.text(formatDate(date)));
    };
  }

  /**
   *
   * 绘制条形图
   *
   */
  // svg 的高度
  const height = margin.top + barSize * n + margin.bottom;
  // 创建 svg
  // 在容器 <div id="container"> 元素内创建一个 SVG 元素
  // 返回一个选择集，只有 svg 一个元素
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  // 初始化，调用相应的函数创建各种图像元素
  // 这些函数最后都会返回一个函数，以便之后进行调用来更新相应的图像元素
  const updateBars = bars(svg); // 创建条形图里的矩形柱子
  const updateAxis = axis(svg); // 创建横坐标轴
  const updateLabels = labels(svg); // 创建（矩形柱子）标注信息
  const updateTicker = ticker(svg); // 更新坐标轴的刻度

  // 将每一个日期（时间点）的数据依次更新到页面上，并在数据更新时应用一些过渡动效
  // 根据不同时间点的数据更新页面的图像元素时，就像是在绘制动画的「关键帧」
  // 因此所使用的变量名称是 keyframe
  // 通过过渡动效将这些「关键帧」连起来就构成了连续流程的动画
  (async function () {
    for (const keyframe of keyframes) {
      // 每次循环都创建一个新的过渡管理器
      const transition = svg
        .transition()
        .duration(duration) // 设置过渡持续时间
        .ease(d3.easeLinear); // 设置过渡的缓动函数

      // 这里先要更新横轴比例尺的定义域
      // 以（当前时间点）新数据的最大值作为定义域的最大值
      // 后面就会使用新的比例尺更新坐标轴
      x.domain([0, keyframe[1][0].value]);

      // 依次调用函数并传入相应的参数，更新相应的图像元素
      updateAxis(keyframe, transition);
      updateBars(keyframe, transition);
      updateLabels(keyframe, transition);
      updateTicker(keyframe, transition);

      // 等待当前的过渡管理器 transition 所创建的过渡都结束时（会抛出 end 事件）
      // 再执行下一次循环
      // transition.end() 方法返回的是一个 Promise，所以这里使用 await 来等待异步操作的完成
      await transition.end();
    }
  })();
});
